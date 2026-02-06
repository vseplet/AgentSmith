import { Context } from "grammy";

export const replyOptions = (ctx: Context) => ({
  reply_parameters: { message_id: ctx.message!.message_id },
});
