import SignUp from "./SignUp";
import { getProviders } from "next-auth/react";

export default async function SignUpPage() {
  const providers = await getProviders();

  return <SignUp providers={providers} />;
}
