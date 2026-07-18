import PageHeader from '../components/PageHeader'
import RestockForm from '../components/RestockForm'

export default function Restock() {
  return (
    <>
      <PageHeader
        title="Add new stock"
        subtitle="Use this when an order you placed arrives at the shop."
      />
      <RestockForm />
    </>
  )
}
