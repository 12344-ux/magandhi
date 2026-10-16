// Helpers pequeños y comprobables para operaciones Auth que devuelven
// `{ data, error }` en vez de lanzar. Mantenerlos sin acceso al DOM.
export async function requestPasswordRecovery(auth, email, options) {
  const { error } = await auth.resetPasswordForEmail(email, options);
  if (error) throw error;
  return true;
}
