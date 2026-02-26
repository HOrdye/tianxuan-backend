import { Request, Response, NextFunction } from 'express';

/**
 * 一个高阶函数，用于捕获 Express 异步路由处理器中的错误。
 * @param fn - 要包裹的异步路由处理器函数。
 * @returns一个新的路由处理器，它会执行原始函数并捕获任何被拒绝的 Promise，然后将其传递给 Express 的错误处理中间件。
 */
export const catchAsync = <T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as T, res, next).catch(next);
  };
};
