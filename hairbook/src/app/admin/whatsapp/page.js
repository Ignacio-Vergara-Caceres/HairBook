import ChatAdmin from "./ChatAdmin";

export default async function WhatsappAdminPage({ searchParams }) {
  const query = await searchParams;
  return <ChatAdmin telefonoInicial={query?.telefono || ""} />;
}
