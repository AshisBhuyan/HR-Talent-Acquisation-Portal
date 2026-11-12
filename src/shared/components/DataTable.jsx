export default function DataTable({
  columns,
  rows,
  keyField = 'id',
  loading = false,
  empty,
  footer,
  minWidth,
  ariaLabel = 'Data table',
}) {
  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table
          className="data-table"
          aria-label={ariaLabel}
          aria-busy={loading}
          style={minWidth ? { minWidth } : undefined}
        >
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{ textAlign: column.align || 'left', width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="skeleton-row">
                  {columns.map((column) => (
                    <td key={column.key}>
                      <div className="skeleton skeleton--line" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading &&
              rows.map((row) => (
                <tr key={row[keyField]}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{ textAlign: column.align || 'left' }}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr className="data-table__empty">
                <td colSpan={columns.length}>{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!loading && rows.length > 0 && footer && (
        <div className="table-footer">{footer}</div>
      )}
    </div>
  );
}
