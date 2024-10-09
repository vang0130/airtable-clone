import SignIn from "./SignIn";
import { getProviders } from "next-auth/react";

export default async function SignInPage() {
  const providers = await getProviders();

  return <SignIn providers={providers} />;
}
