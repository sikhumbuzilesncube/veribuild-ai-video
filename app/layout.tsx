export const metadata = {
  title: 'VeriBuild AI Video',
  description: 'Generate talking heads',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
    }
