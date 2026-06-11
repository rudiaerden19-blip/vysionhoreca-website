import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'

import { resolveZohoEmail, resolveZohoPassword } from '@/lib/vysion-contact'

export function createZohoMailTransport(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> {
  return nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: {
      user: resolveZohoEmail(),
      pass: resolveZohoPassword(),
    },
  })
}

export function assertZohoSmtpConfigured(): string | null {
  if (!resolveZohoEmail() || !resolveZohoPassword()) {
    return 'E-mailserver niet geconfigureerd (ZOHO_EMAIL + ZOHO_PASSWORD in Vercel).'
  }
  return null
}
