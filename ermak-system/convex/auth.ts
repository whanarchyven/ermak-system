import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

/**
 * Единый Password-провайдер для сотрудников (идентификатор = email)
 * и клиентов PWA (идентификатор = номер телефона, передаётся в поле email).
 *
 * Профиль раскладывает переданные параметры по полям документа `users`,
 * чтобы у клиентов корректно сохранялся телефон и имя.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = params.email as string;
        const profile: Record<string, unknown> = { email };
        if (typeof params.name === "string" && params.name.length > 0) {
          profile.name = params.name;
        }
        if (typeof params.phone === "string" && params.phone.length > 0) {
          profile.phone = params.phone;
        }
        return profile as any;
      },
    }),
  ],
});
