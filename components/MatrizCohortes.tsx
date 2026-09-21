'use client';

/**
 * Retencion por cohorte: de los que se inscribieron en un mes, cuantos seguian
 * uno, dos y tres meses despues.
 *
 * Es una magnitud, asi que la escala es de un solo tono de oscuro a claro. Nada
 * de arcoiris: aqui el color solo dice "mas" o "menos".
 */
const RAMPA = ['#191b14', '#2b3617', '#44601d', '#7aab27', '#d7ff3e'];

function celda(porcentaje: number) {
  const paso = Math.min(RAMPA.length - 1, Math.floor((porcentaje / 100) * RAMPA.length));
  return {
    fondo: RAMPA[paso],
    // Sobre los pasos claros el texto oscuro es el unico que se lee.
    texto: paso >= 3 ? '#0b0b0c' : '#e4e4e7',
  };
}

export function MatrizCohortes({ datos }: { datos: any }) {
  const filas = datos?.cohortes ?? [];

  if (filas.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Todavia no hay meses suficientes para medir retencion.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Porcentaje de socios que seguian activos cada mes despues de su alta
        </caption>
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="p-2 font-medium">Se inscribieron en</th>
            <th className="p-2 text-right font-medium">Nuevos</th>
            {datos.periodos.map((p: number) => (
              <th key={p} className="p-2 text-center font-medium">
                {p === 0 ? 'Mes 0' : `+${p}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f: any) => (
            <tr key={f.cohorte}>
              <td className="p-2 font-medium">{f.cohorte}</td>
              <td className="p-2 text-right text-zinc-400">{f.nuevos}</td>
              {f.retencion.map((r: any, i: number) => {
                if (!r) {
                  return (
                    <td key={i} className="p-1">
                      <div className="rounded-lg border border-dashed border-borde py-2 text-center text-zinc-700">
                        —
                      </div>
                    </td>
                  );
                }
                const c = celda(r.porcentaje);
                return (
                  <td key={i} className="p-1">
                    <div
                      className="rounded-lg py-2 text-center font-semibold"
                      style={{ background: c.fondo, color: c.texto }}
                      title={`${r.socios} de ${f.nuevos} socios seguian activos`}
                    >
                      {r.porcentaje}%
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-sm text-zinc-500">
        Cada fila es el mes en que se inscribieron. Las columnas dicen que porcentaje seguia con
        membresia vigente ese mes, uno, dos y tres meses despues.
      </p>
    </div>
  );
}
