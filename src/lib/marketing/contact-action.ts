"use server";

import { sendContactFormEmail } from "@/lib/email";

export interface ContactFormInput {
  name: string;
  email: string;
  company?: string;
  message: string;
}

export interface ContactFormResult {
  success: boolean;
  error?: string;
}

export async function submitContactFormAction(
  data: ContactFormInput
): Promise<ContactFormResult> {
  // Basic server-side validation
  if (!data.name || data.name.trim().length < 2) {
    return { success: false, error: "Please enter your name." };
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!data.message || data.message.trim().length < 10) {
    return { success: false, error: "Please enter a message (at least 10 characters)." };
  }

  try {
    await sendContactFormEmail({
      name: data.name.trim(),
      email: data.email.trim(),
      company: data.company?.trim() || undefined,
      message: data.message.trim(),
    });
    return { success: true };
  } catch {
    return { success: false, error: "Could not send your message. Please try emailing us directly." };
  }
}
