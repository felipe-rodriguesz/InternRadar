import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';

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
    const response = host
      .switchToHttp()
      .getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    response.status(status).json({
      statusCode: status,
      code: codes[status] ?? 'INTERNAL_ERROR',
      message: messages[status] ?? 'Não foi possível concluir a operação.',
    });
  }
}
