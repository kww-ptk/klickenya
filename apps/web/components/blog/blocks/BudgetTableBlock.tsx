interface BudgetRow { label?: string; values?: string[] }
interface BudgetTableValue { columns?: string[]; rows?: BudgetRow[]; totalRow?: string[] }

export function BudgetTableBlock({ value }: { value: BudgetTableValue }) {
  const { columns = [], rows = [], totalRow } = value
  return (
    <div className="my-6 rounded-[22px] overflow-hidden border border-[#E4E0D8]">
      <table className="w-full border-collapse">
        <thead className="bg-[#18160F]">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="py-3.5 px-[18px] text-left text-[11.5px] font-extrabold tracking-[.06em] uppercase text-white/50">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-[#E4E0D8] last:border-b-0 ${i % 2 === 1 ? 'bg-[#F4F2EE]' : ''}`}>
              <td className="py-[13px] px-[18px] text-[14.5px] font-semibold text-[#18160F]">{row.label}</td>
              {(row.values ?? []).map((val, j) => (
                <td key={j} className={`py-[13px] px-[18px] text-[14.5px] text-[#5C574E] ${j === (row.values?.length ?? 0) - 1 ? 'font-bold text-[#18160F]' : ''}`}>
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totalRow && totalRow.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-[rgba(232,160,32,.2)]">
              {totalRow.map((val, i) => (
                <td key={i} className="py-3.5 px-[18px] bg-[rgba(232,160,32,.11)] text-[15px] font-extrabold text-[#18160F]">
                  {val}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
