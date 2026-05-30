import TelegramBot from 'node-telegram-bot-api';
import { ConvexHttpClient } from 'convex/browser';

export type StepId = string;

export type RenderCtx = {
  bot: TelegramBot;
  convex: ConvexHttpClient;
  chatId: number;
};

export type StepDef = {
  id: StepId;
  render: (ctx: RenderCtx) => Promise<void>;
  backStep?: StepId;
  onText?: (text: string, ctx: RenderCtx) => Promise<StepId | undefined>;
};

const steps = new Map<StepId, StepDef>();
const currentByChat = new Map<number, StepId>();

export function registerStep(step: StepDef) {
  steps.set(step.id, step);
}

export function setCurrent(chatId: number, stepId: StepId) {
  currentByChat.set(chatId, stepId);
}

export function getCurrent(chatId: number): StepId | undefined {
  return currentByChat.get(chatId);
}

export async function goTo(stepId: StepId, ctx: RenderCtx) {
  const def = steps.get(stepId);
  if (!def) return;
  setCurrent(ctx.chatId, stepId);
  await def.render(ctx);
}

export async function handleText(ctx: RenderCtx, text: string) {
  const currId = getCurrent(ctx.chatId);
  if (!currId) return;
  const curr = steps.get(currId);
  if (!curr) return;
  if (text === '⬅️ Назад' && curr.backStep) {
    await goTo(curr.backStep, ctx);
    return;
  }
  if (curr.onText) {
    const next = await curr.onText(text, ctx);
    if (next) {
      await goTo(next, ctx);
    }
  }
}


