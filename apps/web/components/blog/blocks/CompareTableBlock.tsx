interface CompareColumn { label?: string; color?: string }
interface CompareRow { criterion?: string; values?: string[]; winners?: number[] }
interface CompareTableValue { columns?: CompareColumn[]; rows?: CompareRow[] }

const colHeaderColor: Record<string, string> = { teal: 'text-[#7DD3B0]', blue: 'text-[#93C5FD]', purple: 'text-[#C4B5FD]', amber: 'text-[#FBBF24]' }
const winBadgeStyle: Record<string, string> = {
  teal: 'bg-[rgba(13,115,119,.1)] text-[#0D7377]',
  blue: 'bg-[rgba(37,99,235,.1)] text-[#2563EB]',
  purple: 'bg-[rgba(139,77,171,.1)] text-[#8B4DAB]',
  amber: 'bg-[rgba(232,160,32,.1)] text-[#B8860B]',
}

export function CompareTableBlock({ value }: { value: CompareTableValue }) {
  const { columns = [], rows = [] } = value
  return (
    <div className="my-6 rounded-[22px] overflow-x-auto border border-[#E4E0D8]">
      <table className="w-full border-collapse">
        <thead className="bg-[#18160F]">
          <tr>
            <th className="py-3.5 px-[18px] text-left text-[11.5px] font-extrabold tracking-[.06em] uppercase text-white/30" />
            {columns.map((col, i) => (
              <th key={i} className={`py-3.5 px-[18px] text-left text-[11.5px] font-extrabold tracking-[.06em] uppercase ${colHeaderColor[col.color || 'teal']}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-[#E4E0D8] last:border-b-0 ${i % 2 === 1 ? 'bg-[#F4F2EE]' : ''}`}>
              <td className="py-[13px] px-[18px] text-[13px] font-bold text-[#18160F] whitespace-nowrap">{row.criterion}</td>
              {(row.values ?? []).map((val, j) => {
                const isWinner = (row.winners ?? []).includes(j)
                const col = columns[j]
                return (
                  <td key={j} className="py-[13px] px-[18px] text-[14px] text-[#5C574E] align-top">
                    {val}
                    {isWinner && (
                      <span className={`inline-block ml-2 py-0.5 px-2.5 rounded-full text-[11px] font-extrabold ${winBadgeStyle[col?.color || 'teal']}`}>
                        ✓
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
