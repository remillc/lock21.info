import { useState, useRef, useEffect, memo } from 'react'
// import Head from '@docusaurus/Head'

// export default function Script({ children }) {
//   console.log('children', children)
//   return (
//     <Head>
//       <script
//         dangerouslySetInnerHTML={{
//           __html: children,
//         }}
//       ></script>
//     </Head>
//   )
// }

const Script = memo(({ children }) => {
  console.log('children', children)
  console.log('children', children?.map((child) => child.props.children).join('\n'))
  const divRef = useRef(null)

  useEffect(() => {
    if (divRef.current === null) {
      return
    }

    const doc = document.createRange().createContextualFragment(`<script>${children?.map((child) => (Array.isArray(child.props.children) ? child.props.children.join('') : child.props.children)).join('\n')}</script>`)

    divRef.current.innerHTML = ''
    divRef.current.appendChild(doc)
  })

  return <div ref={divRef}></div>
})

export default Script
