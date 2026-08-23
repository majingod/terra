import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Accueil from './pages/Accueil'
import Creer from './pages/Creer'
import Fiche from './pages/Fiche'
import Encyclopedie from './pages/Encyclopedie'
import PageImpression from './pages/impression/PageImpression'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Accueil />} />
        <Route path="/creer" element={<Creer />} />
        <Route path="/fiche/:id" element={<Fiche />} />
        <Route path="/fiche/:id/impression" element={<PageImpression />} />
        <Route path="/encyclopedie" element={<Encyclopedie />} />
      </Route>
    </Routes>
  )
}
