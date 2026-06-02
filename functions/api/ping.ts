export const onRequest = async () => {
  return Response.json({ ok: true, time: Date.now() });
};
