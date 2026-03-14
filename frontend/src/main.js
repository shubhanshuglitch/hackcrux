import './style.css'

document.querySelector('#app').innerHTML = `
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Hackcrux</p>
      <h1>Vite frontend is ready.</h1>
      <p class="lead">
        This frontend is now running on Vite and ready for your UI components,
        API integration, and build pipeline.
      </p>
      <div class="actions">
        <a class="button primary" href="http://localhost:8080/api/health" target="_blank" rel="noreferrer">Check backend</a>
        <button class="button secondary" id="ping-button" type="button">Test frontend</button>
      </div>
      <p class="status" id="status">Frontend loaded successfully.</p>
    </section>
  </main>
`

const statusElement = document.querySelector('#status')
const pingButton = document.querySelector('#ping-button')

pingButton?.addEventListener('click', () => {
  if (statusElement) {
    statusElement.textContent = 'Vite is serving this frontend correctly.'
  }
})