import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
export const metadata: Metadata = { title: "Sign up" };
export default function Signup() { return <AuthForm mode="signup" />; }
