// Comprueba el dígito verificador del RUT chileno mediante módulo 11.
// Acepta formatos con o sin puntos y guion, incluido el dígito K.
export function rutChilenoValido(valor) {
  const rut = String(valor ?? "").replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(rut)) return false;

  let suma = 0;
  let factor = 2;
  for (let i = rut.length - 2; i >= 0; i--) {
    suma += Number(rut[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return rut.at(-1) === verificador;
}
