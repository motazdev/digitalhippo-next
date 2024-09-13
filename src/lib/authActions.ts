export const signIn = async (creds: { email: string; password: string }) => {
  try {
    const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: creds.email,
        password: creds.password,
      }),
    })
    const data = await req.json()
    return data.user
  } catch (err) {
    console.log(err)
  }
}
