export { auth as middleware } from './auth'
// note the addition of /share here - once a chat has a share path it is accessible to anyone with the link
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|share).*)']
}
