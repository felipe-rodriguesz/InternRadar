import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { InvalidQueryError } from '../jobs/jobs-query';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const status =
      error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const codes: Record<number, string> = {
      400: 'INVALID_REQUEST',
      404: 'NOT_FOUND',
      503: 'SERVICE_UNAVAILABLE',
    };
    const messages: Record<number, string> = {
      400: 'Requisição inválida.',
      404: 'Recurso não encontrado.',
      503: 'Serviço temporariamente indisponível.',
    };
    const details = error instanceof HttpException ? error.getResponse() : null;
    const databaseUnavailable =
      status === 503 &&
      typeof details === 'object' &&
      details !== null &&
      'code' in details &&
      details.code === 'DATABASE_UNAVAILABLE';
    const response = host
      .switchToHttp()
      .getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    response.status(status).json({
      statusCode: status,
      code:
        error instanceof InvalidQueryError
          ? 'INVALID_QUERY'
          : databaseUnavailable
            ? 'DATABASE_UNAVAILABLE'
            : (codes[status] ?? 'INTERNAL_ERROR'),
      message:
        error instanceof InvalidQueryError
          ? error.safeMessage
          : databaseUnavailable
            ? 'Banco de dados temporariamente indisponível.'
            : (messages[status] ?? 'Não foi possível concluir a operação.'),
    });
  }
}
