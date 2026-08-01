const MESES_NORM: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function normalizarTexto(texto: string): string {
  return texto.toLowerCase()
    .replace(/[áàä]/g, 'a')
    .replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u');
}

function inicioDelDia(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
}

export function extraerFechaLejana(
  texto: string,
  timezone?: string,
): string | null {
  const tz = timezone || 'America/Bogota';
  const hoy = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const hoyInicio = inicioDelDia(hoy);
  const sieteDias = new Date(hoyInicio.getTime() + 7 * 86400000);
  const t = normalizarTexto(texto);

  let fechaObj: Date | null = null;

  const mEx = t.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (mEx) {
    fechaObj = new Date(parseInt(mEx[3]), parseInt(mEx[2]) - 1, parseInt(mEx[1]));
  }

  if (!fechaObj) {
    const mNb = t.match(
      /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s*(?:de\s+)?(\d{4})?\b/i,
    );
    if (mNb) {
      const dia = parseInt(mNb[1]);
      const mesNombre = mNb[2].toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const mes = MESES_NORM[mesNombre];
      const anio = mNb[3] ? parseInt(mNb[3]) : hoy.getFullYear();
      if (mes) fechaObj = new Date(anio, mes - 1, dia);
    }
  }

  if (!fechaObj) {
    const mD = t.match(/\b(?:en|dentro\s+de)\s+(\d{1,2})\s*d[ií]as?\b/i);
    if (mD) {
      fechaObj = new Date(hoyInicio.getTime() + (parseInt(mD[1]) + 1) * 86400000);
    }
  }

  if (!fechaObj) {
    const mS = t.match(
      /\b(?:el\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)(?:\s+(?:proximo|que\s+viene|de\s+la\s+(?:otra|proxima)\s+semana))?\b/i,
    );
    if (mS) {
      const target = NOMBRES_DIAS.indexOf(
        mS[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      );
      if (target >= 0) {
        let diff = target - hoy.getDay();
        if (diff <= 0) diff += 7;
        fechaObj = new Date(hoyInicio.getTime() + diff * 86400000);
      }
    }
  }

  if (!fechaObj || isNaN(fechaObj.getTime()) || fechaObj <= hoyInicio || fechaObj <= sieteDias) {
    return null;
  }

  return (
    String(fechaObj.getDate()).padStart(2, '0') +
    '/' +
    String(fechaObj.getMonth() + 1).padStart(2, '0') +
    '/' +
    fechaObj.getFullYear()
  );
}
