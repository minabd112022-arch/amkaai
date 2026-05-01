import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }: any) {
      // أول تسجيل دخول
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;

        // 🧠 جلب credits من database
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
        });

        session.user.credits = dbUser?.credits || 0;
      }

      return session;
    },
  },

  pages: {
    signIn: "/", // تقدر تغيرها لاحقاً
  },

  secret: process.env.NEXTAUTH_SECRET,
};