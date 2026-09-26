import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEFAULT_AVATAR_ID, normalizeAvatarId } from "@/lib/avatar-presets";
import { loginLimiter } from "@/lib/rate-limit";

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

        // Brute-force protection: max 10 failed attempts per email per 15 min
        const rateCheck = loginLimiter.hit(normalizedEmail);
        if (!rateCheck.allowed) {
          // Returning null causes NextAuth to emit a generic CredentialsSignin error
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { universities: { include: { university: true } } },
        });

        if (!user) return null;

        if (!user.isActive) return null;

        if (!user.emailVerifiedAt) return null;

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        // Successful login — reset the counter
        loginLimiter.reset(normalizedEmail);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastSeenAt: new Date() },
        });

        const universities = (user.universities ?? [])
          .map((link: { university?: { name?: string | null } | null }) => link.university?.name?.trim())
          .filter((name: string | undefined | null): name is string => Boolean(name));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: normalizeAvatarId(user.avatar) ?? DEFAULT_AVATAR_ID,
          university: user.university ?? universities[0] ?? null,
          universityVerified: user.universityVerified,
          universities,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const tokenWithUniversities = token as typeof token & { universities?: string[] };

      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.avatar = normalizeAvatarId((user as { avatar?: string }).avatar);
        token.university = (user as { university?: string | null }).university ?? null;
        token.universityVerified = Boolean((user as { universityVerified?: boolean }).universityVerified);
        const userUniversities = Array.isArray((user as { universities?: unknown[] }).universities)
          ? ((user as { universities: unknown[] }).universities as string[])
          : [];
        tokenWithUniversities.universities = userUniversities
          .map((value: unknown) => String(value).trim())
          .filter(Boolean);
        if (!tokenWithUniversities.universities.length && token.university) {
          tokenWithUniversities.universities = [token.university];
        }
      }
      if (trigger === "update") {
        if (typeof session?.name === "string" && session.name.trim().length > 0) {
          token.name = session.name.trim();
        }
        if (typeof session?.email === "string" && session.email.trim().length > 0) {
          token.email = session.email.trim().toLowerCase();
        }
        const nextAvatar = session?.avatar;
        if (typeof nextAvatar === "string" && nextAvatar.length > 0) {
          token.avatar = normalizeAvatarId(nextAvatar);
        }
        if (typeof session?.university === "string") {
          token.university = session.university.trim() || null;
        }
        if (Array.isArray(session?.universities)) {
          const sessionUniversities = (session.universities as unknown[])
            .map((value: unknown) => String(value).trim())
            .filter(Boolean);
          tokenWithUniversities.universities = sessionUniversities;
          if (tokenWithUniversities.universities.length > 0) {
            token.university = tokenWithUniversities.universities[0] ?? token.university ?? null;
          }
        }
        if (typeof session?.universityVerified === "boolean") {
          token.universityVerified = session.universityVerified;
        }

        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            avatar: true,
            name: true,
            email: true,
            university: true,
            universityVerified: true,
            universities: { include: { university: true } },
          },
        });

        if (fresh) {
          if (!session?.name || session.name.trim().length === 0) {
            token.name = fresh.name;
          }
          if (!session?.email || session.email.trim().length === 0) {
            token.email = fresh.email;
          }
          if (!session?.avatar || session.avatar.length === 0) {
            token.avatar = normalizeAvatarId(fresh.avatar);
          }
          if (typeof session?.university !== "string") {
            token.university = fresh.university;
          }
          if (!Array.isArray(session?.universities) || session.universities.length === 0) {
            tokenWithUniversities.universities = (fresh.universities ?? [])
              .map((link: { university?: { name?: string | null } | null }) => link.university?.name?.trim())
              .filter((name: string | undefined | null): name is string => Boolean(name));
          }
          if (typeof session?.universityVerified !== "boolean") {
            token.universityVerified = fresh.universityVerified;
          }
        }
        if (!Array.isArray(tokenWithUniversities.universities) || tokenWithUniversities.universities.length === 0) {
          tokenWithUniversities.universities = token.university ? [token.university] : [];
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionToken = token as typeof token & { universities?: string[] };
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.name = (token.name as string | undefined) ?? session.user.name;
        session.user.email = (token.email as string | undefined) ?? session.user.email;
        session.user.avatar = token.avatar as string | undefined;
        session.user.university = (token.university as string | null | undefined) ?? ((Array.isArray(sessionToken.universities) && sessionToken.universities[0]) || null);
        session.user.universityVerified = Boolean(token.universityVerified);
        session.user.universities = Array.isArray(sessionToken.universities)
          ? (sessionToken.universities as unknown[]).map((value: unknown) => String(value).trim()).filter(Boolean)
          : session.user.university ? [session.user.university] : [];
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
