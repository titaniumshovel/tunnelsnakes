import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Report Trade — The Sandlot',
  description: 'Report a completed trade in The Sandlot fantasy baseball league.',
}

export default function OfferPage() {
  redirect('/trades?tab=propose')
}
