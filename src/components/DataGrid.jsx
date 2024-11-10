import { useRef, useEffect, memo } from 'react'
import { Grid } from 'gridjs'
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment'
import { formatDuration } from 'date-fns'
import { enCA, frCA } from 'date-fns/locale'

const DataGrid = memo(({ children }) => {
  console.log('children', children)
  // console.log('children', children.map((child) => child.props.children).join('\n'))
  const divRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (divRef.current === null) {
      return
    }

    async function addFooter() {
      if (ExecutionEnvironment.canUseDOM) {
        const table = document.querySelector('.table-journal-plongees > table')
        table.classList.add('table-scroll', 'small-first-col')
        const totalTimeInMinutes = [...table.querySelectorAll('tbody td:nth-child(5)')].map((td) => parseFloat(td.innerText)).reduce((a, b) => a + b, 0)

        const locale = document.documentElement.lang === 'fr' ? frCA : enCA

        function formatTime(timeInMinutes) {
          const duration = {
            minutes: timeInMinutes % 60,
            hours: Math.floor((timeInMinutes / 60) % 24),
            days: Math.floor(timeInMinutes / (60 * 24)),
          }

          return formatDuration(duration, { locale, format: ['days', 'hours', 'minutes'] })
        }

        const tFoot = document.createElement('tfoot')
        tFoot.innerHTML = `
          <tr>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td>${formatTime(totalTimeInMinutes)}</td>
          <td></td>
          <td></td>
          </tr>
          `
        table.appendChild(tFoot)
      }
    }

    addFooter()

    //   const doc = document.createRange().createContextualFragment(`<script>${children.map((child) => (Array.isArray(child.props.children) ? child.props.children.join('') : child.props.children)).join('\n')}</script>`)

    //   divRef.current.innerHTML = ''
    //   divRef.current.appendChild(doc)
  })

  return (
    <>
      {children}
      <div ref={wrapperRef}></div>
    </>
  )
})

export default DataGrid
