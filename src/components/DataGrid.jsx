import { useState, useRef, useEffect, memo } from 'react'
import { Grid } from 'gridjs'
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const DataGrid = memo(({ children }) => {
  console.log('children', children)
  // console.log('children', children.map((child) => child.props.children).join('\n'))
  const divRef = useRef(null)

  useEffect(() => {
    if (divRef.current === null) {
      return
    }

    

if (ExecutionEnvironment.canUseDOM) {
  console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! DataGrid')
  const table = document.querySelector('.table-journal-plongees > table')
  table.classList.add('table-scroll', 'small-first-col')
  const totalTime = [...table.querySelectorAll('tbody td:nth-child(5)')].map(td => parseFloat(td.innerText)).reduce((a, b) => a + b, 0)

  const tFoot = document.createElement('tfoot')
  tFoot.innerHTML = `
  <tr>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td>${totalTime}</td>
  <td></td>
  <td></td>
  </tr>
  `
  table.appendChild(tFoot)
}

  //   const doc = document.createRange().createContextualFragment(`<script>${children.map((child) => (Array.isArray(child.props.children) ? child.props.children.join('') : child.props.children)).join('\n')}</script>`)

  //   divRef.current.innerHTML = ''
  //   divRef.current.appendChild(doc)
  })

  return <div className="table table-journal-plongees" ref={divRef}>
    {children}
    </div>
})

export default DataGrid
