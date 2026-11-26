export default function Spinner(props: { class?: string }) {
  return (
    <span
      class={
        props.class ??
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600'
      }
    />
  )
}
