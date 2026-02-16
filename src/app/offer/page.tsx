import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Trade Portal — The Sandlot',
  description: 'Propose a trade in The Sandlot fantasy baseball league.',
}

export default function OfferPage() {
  redirect('/trades?tab=propose')
}
