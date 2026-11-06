import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
export const metadata: Metadata = { title: "Log in" };
export default function Login() { return <AuthForm mode="login" />; }
