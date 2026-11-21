import type { Mail } from '../mail/mail.service.js';
import type { Message } from './message.entity.js';

/** Tells the owner about a new message from the contact form. */
export function contactMail(message: Message, to: string, publicUrl: string): Mail {
  return {
    to,
    replyTo: message.email,
    subject: `Zpráva z webu: ${message.name}`,
    text: `Nová zpráva z kontaktního formuláře.

Jméno: ${message.name}
E-mail: ${message.email}
Telefon: ${message.phone.trim() || '–'}

${message.body}

Ze zprávy můžete rovnou vytvořit rezervaci v administraci:
${publicUrl}/admin/messages
`,
  };
}
