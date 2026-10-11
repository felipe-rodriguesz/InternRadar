import assert from 'node:assert/strict';
import console from 'node:console';
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { createConnection, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

// Recursos próprios: nunca executar este teste sobre o projeto de uso diário.
const project = `internradar-check-${randomUUID().replaceAll('-', '').slice(0, 12)}`;
const composeFile = fileURLToPath(new URL('../compose.yaml', import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'internradar-db-check-'));
const emptyEnv = join(temporary, 'empty.env');
writeFileSync(emptyEnv, '', { mode: 0o600 });
const devPassword = randomBytes(24).toString('hex');
const testPassword = randomBytes(24).toString('hex');
let env;
let started = false;

function redact(text) {
  return text.replaceAll(devPassword, '[REDACTED]').replaceAll(testPassword, '[REDACTED]');
}

function docker(args, options = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    timeout: 180_000,
    env,
    ...options,
  });
  if (result.error || result.status !== 0) {
    throw new Error(redact(result.error?.message ?? result.stderr ?? 'Docker falhou'));
  }
  return result.stdout.trim();
}

const composeArgs = ['compose', '-f', composeFile, '--env-file', emptyEnv, '-p', project];
const compose = (...args) => docker([...composeArgs, ...args]);

function sql(service, query) {
  return docker(
    [
      ...composeArgs,
      'exec',
      '--no-TTY',
      service,
      'sh',
      '-c',
      'PGPASSWORD="$POSTGRES_PASSWORD" exec psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -v ON_ERROR_STOP=1 -At',
    ],
    { input: query },
  );
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function hostConnection(port) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(5000);
    socket.once('error', reject);
    socket.once('timeout', () => socket.destroy(new Error('Timeout no PostgreSQL do host')));
    socket.once('connect', () => {
      // SSLRequest do protocolo PostgreSQL: resposta S/N identifica o servidor.
      const request = Buffer.alloc(8);
      request.writeInt32BE(8, 0);
      request.writeInt32BE(80877103, 4);
      socket.write(request);
    });
    socket.once('data', (data) => {
      socket.end();
      try {
        assert(['S', 'N'].includes(data.toString('ascii', 0, 1)));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

try {
  const devPort = await freePort();
  let testPort = await freePort();
  while (testPort === devPort) testPort = await freePort();
  env = {
    ...process.env,
    POSTGRES_USER: 'internradar_check',
    POSTGRES_PASSWORD: devPassword,
    POSTGRES_DB: 'internradar_check',
    POSTGRES_PORT: String(devPort),
    POSTGRES_TEST_USER: 'internradar_test_check',
    POSTGRES_TEST_PASSWORD: testPassword,
    POSTGRES_TEST_DB: 'internradar_test_check',
    POSTGRES_TEST_PORT: String(testPort),
  };
  assert.equal(
    docker(['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`]),
    '',
  );
  assert.equal(
    docker(['volume', 'ls', '-q', '--filter', `label=com.docker.compose.project=${project}`]),
    '',
  );
  compose('--profile', 'test', 'config', '--quiet');
  // Conferir o modelo resolvido antes de criar containers: nenhum volume existente.
  const config = JSON.parse(compose('--profile', 'test', 'config', '--format', 'json'));
  const existingVolumes = docker(['volume', 'ls', '--format', '{{.Name}}']).split('\n');
  const services = { postgres: 'postgres_data', 'postgres-test': 'postgres_test_data' };
  assert.deepEqual(Object.keys(config.volumes).sort(), Object.values(services).sort());
  for (const [service, source] of Object.entries(services)) {
    const volume = config.volumes[source];
    assert(!volume.external, 'O verificador não aceita volumes externos.');
    assert.equal(volume.name, `${project}_${source}`, 'Volume fora do projeto próprio.');
    assert(
      !existingVolumes.includes(volume.name),
      'O verificador não reutiliza volumes existentes.',
    );
    const mounts = config.services[service].volumes;
    assert.equal(mounts.length, 1, 'O verificador aceita somente o volume de dados próprio.');
    assert.equal(mounts[0].type, 'volume');
    assert.equal(mounts[0].source, source);
    assert.equal(mounts[0].target, '/var/lib/postgresql/data');
  }
  console.log(
    'PASS: volumes resolvidos pertencem ao projeto novo; nenhum volume existente montado.',
  );
  for (const [variable, value, message] of [
    ['POSTGRES_PASSWORD', '', 'POSTGRES_PASSWORD'],
    ['POSTGRES_PORT', 'invalid-port', 'port'],
  ]) {
    const bad = spawnSync('docker', [...composeArgs, '--profile', 'test', 'config', '--quiet'], {
      encoding: 'utf8',
      env: { ...env, [variable]: value },
      timeout: 30_000,
    });
    assert(bad.status !== 0 && !bad.error);
    assert(bad.stderr.toLowerCase().includes(message.toLowerCase()));
  }
  console.log('PASS: configuração válida; senha ausente e porta inválida rejeitadas.');
  started = true;
  compose('--profile', 'test', 'up', '--detach', '--wait', '--wait-timeout', '90');
  const inspections = ['postgres', 'postgres-test'].map((service) => {
    const id = compose('--profile', 'test', 'ps', '--quiet', service);
    const [container] = JSON.parse(docker(['inspect', id]));
    assert.equal(container.State.Health.Status, 'healthy');
    assert.equal(container.NetworkSettings.Ports['5432/tcp'][0].HostIp, '127.0.0.1');
    return container;
  });
  assert.notEqual(inspections[0].Mounts[0].Name, inspections[1].Mounts[0].Name);
  assert.notDeepEqual(
    Object.keys(inspections[0].NetworkSettings.Networks),
    Object.keys(inspections[1].NetworkSettings.Networks),
  );
  await hostConnection(devPort);
  await hostConnection(testPort);
  for (const service of ['postgres', 'postgres-test']) {
    assert.equal(sql(service, 'SELECT 1;'), '1');
  }
  const wrongPassword = spawnSync(
    'docker',
    [
      ...composeArgs,
      'exec',
      '--no-TTY',
      'postgres',
      'sh',
      '-c',
      'PGPASSWORD=wrong-password exec psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -c "SELECT 1;"',
    ],
    { encoding: 'utf8', env, timeout: 30_000 },
  );
  assert(wrongPassword.status !== 0 && !wrongPassword.error);
  assert(wrongPassword.stderr.includes('password authentication failed'));
  console.log('PASS: dois healthchecks, TCP no host, SQL autenticado e senha incorreta rejeitada.');
  for (const [service, marker] of [
    ['postgres', 'development'],
    ['postgres-test', 'testing'],
  ]) {
    sql(
      service,
      `CREATE TABLE foundation_probe (marker text); INSERT INTO foundation_probe VALUES ('${marker}');`,
    );
    assert.equal(sql(service, 'SELECT marker FROM foundation_probe;'), marker);
  }
  assert.notEqual(
    sql('postgres', 'SELECT system_identifier FROM pg_control_system();'),
    sql('postgres-test', 'SELECT system_identifier FROM pg_control_system();'),
  );
  compose('restart', 'postgres');
  compose('up', '--detach', '--wait', '--wait-timeout', '90', 'postgres');
  assert.equal(sql('postgres', 'SELECT marker FROM foundation_probe;'), 'development');
  const oldId = inspections[0].Id;
  compose('up', '--force-recreate', '--detach', '--wait', '--wait-timeout', '90', 'postgres');
  assert.notEqual(compose('ps', '--quiet', 'postgres'), oldId);
  assert.equal(sql('postgres', 'SELECT marker FROM foundation_probe;'), 'development');
  assert.equal(sql('postgres-test', 'SELECT marker FROM foundation_probe;'), 'testing');
  console.log(
    'PASS: dados persistem após restart e recriação; clusters, volumes e dados isolados.',
  );
} catch (error) {
  console.error(redact(error.message));
  process.exitCode = 1;
} finally {
  try {
    if (started) {
      // Parar somente o projeto próprio. Volumes e dados permanecem preservados.
      const volumes = docker([
        'volume',
        'ls',
        '-q',
        '--filter',
        `label=com.docker.compose.project=${project}`,
      ]);
      for (const name of volumes.split('\n').filter(Boolean)) {
        const [volume] = JSON.parse(docker(['volume', 'inspect', name]));
        assert.equal(volume.Labels['com.docker.compose.project'], project);
        assert(name.startsWith(`${project}_`));
      }
      compose('--profile', 'test', 'stop');
      console.log(`PASS: containers próprios parados; volumes preservados no projeto ${project}.`);
    }
  } catch (error) {
    console.error(redact(`Falha ao parar o projeto ${project}: ${error.message}`));
    process.exitCode = 1;
  }
  rmSync(temporary, { recursive: true, force: true });
}
