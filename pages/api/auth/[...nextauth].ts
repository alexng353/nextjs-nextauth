import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { MongoDBAdapter } from "lib/mongodb-adapter";

import { MongoClient, ObjectId } from "mongodb";

const useSecureCookies = true;

const uri = process.env.MONGODB_URI;
const options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
};
if (!process.env.MONGODB_URI || !uri) {
  throw new Error("Please add your Mongo URI to .env.local");
}

let client = new MongoClient(uri, options as any);
let clientPromise = client.connect();

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: "data",
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  jwt: {
    maxAge: 60 * 60 * 24 * 30,
  },
  session: { strategy: "jwt" },
  // DO NOT TOUCH THE JWT STUFF (above)
  callbacks: {
    async jwt(data: any) {
      const { token } = data;

      const thing = await client
        .db("data")
        .collection("users")
        .findOne({ _id: new ObjectId(token.sub) });

      if (thing) {
        token.role = thing.role;
      }

      return token;
    },
    async session(data: any) {
      // eslint-disable-next-line no-unused-vars
      const { session, token, user } = data;
      // console.log(token);
      session.user.role = token.role;

      return session;
    },
    // eslint-disable-next-line no-unused-vars
    async signIn(props: any) {
      // console.log(props);

      return true;
    },
  },
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        domain: `.edubeyond.dev`,
        secure: useSecureCookies,
      },
    },
  },
};

export default NextAuth(authOptions as any);
