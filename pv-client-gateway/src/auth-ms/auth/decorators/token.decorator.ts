import { createParamDecorator, ExecutionContext, InternalServerErrorException } from "@nestjs/common";

export const Token = createParamDecorator(
    (_: unknown, context: ExecutionContext)=> {

        const request = context.switchToHttp().getRequest();

        if(!request.token){
            // Es un erro porq no viene el token o no se reconoce el token
            throw new InternalServerErrorException("No se encontro el Token (AuthGuard)")
        }

        return request.token
    }
)