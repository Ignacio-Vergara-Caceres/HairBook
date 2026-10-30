import ChatAdmin from "@/app/admin/whatsapp/ChatAdmin";
export default async function WhatsappProfesionalPage({ searchParams }) {
  const query = await searchParams;
  return <ChatAdmin rol="profesional" telefonoInicial={query?.telefono || ""} />;
}
