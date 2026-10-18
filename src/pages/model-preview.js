import Layout from '@theme/Layout'
import ModelViewer from '@site/src/components/ModelViewer'

// Test page for the tiled model (proof of concept, not linked from the menu)
export default function ModelPreview() {
  return (
    <Layout title="Modèle 3D (aperçu)" description="Aperçu du modèle 3D de l'écluse 21" noFooter>
      <ModelViewer />
    </Layout>
  )
}
