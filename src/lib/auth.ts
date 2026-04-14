import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEFAULT_AVATAR_ID, normalizeAvatarId } from "@/lib/avatar-presets";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const normalizedEmail = (credentials.email as string).toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) return null;

        if (!user.isActive) return null;

        if (!user.emailVerifiedAt) return null;

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastSeenAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: normalizeAvatarId(user.avatar) ?? DEFAULT_AVATAR_ID,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
        token.avatar = normalizeAvatarId((user as { avatar?: string }).avatar);
      }
      if (trigger === "update") {
        const nextAvatar = session?.avatar;
        if (typeof nextAvatar === "string" && nextAvatar.length > 0) {
          token.avatar = normalizeAvatarId(nextAvatar);
        } else {
          const fresh = await prisma.user.findUnique({ where: { id: token.id as string }, select: { avatar: true } });
          if (fresh) token.avatar = normalizeAvatarId(fresh.avatar);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.avatar = token.avatar as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
