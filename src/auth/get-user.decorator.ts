import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user || {};
    
    // If data is provided, return specific field (e.g., 'sub' for userId)
    if (data) return user[data];
    
    // Otherwise return entire user object
    return user;
  },
);
