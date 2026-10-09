// Las reservas se agendan en horario de Chile, independientemente de la zona
// horaria del servidor (por ejemplo, UTC en Vercel).
const formateadorChile = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function fechaISOValida(fecha) {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }
  const instante = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(instante.getTime()) && instante.toISOString().slice(0, 10) === fecha;
}

function partesChile(instante) {
  const partes = Object.fromEntries(
    formateadorChile.formatToParts(instante).map(({ type, value }) => [type, value])
  );
  return {
    year: Number(partes.year),
    month: Number(partes.month),
    day: Number(partes.day),
    hour: Number(partes.hour),
    minute: Number(partes.minute),
  };
}

export function fechaHoraChileAUtc(fecha, hora) {
  if (!fechaISOValida(fecha) || typeof hora !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    return null;
  }

  const [year, month, day] = fecha.split("-").map(Number);
  const [hour, minute] = hora.split(":").map(Number);
  const deseado = Date.UTC(year, month - 1, day, hour, minute);
  let candidato = deseado;

  // Encuentra el instante UTC cuya fecha/hora en Santiago coincide con la reserva.
  // No asumimos un desplazamiento fijo porque en Chile hay cambios de horario.
  for (let intento = 0; intento < 4; intento++) {
    const real = partesChile(new Date(candidato));
    const representadoComoUTC = Date.UTC(
      real.year, real.month - 1, real.day, real.hour, real.minute
    );
    const diferencia = deseado - representadoComoUTC;
    candidato += diferencia;
    if (diferencia === 0) break;
  }

  const real = partesChile(new Date(candidato));
  if (
    real.year !== year || real.month !== month || real.day !== day ||
    real.hour !== hour || real.minute !== minute
  ) {
    return null;
  }
  return new Date(candidato);
}
