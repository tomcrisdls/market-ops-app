import { Header }          from './components/layout/Header'
import { BeverageModule }  from './modules/beverages/BeverageModule'

/**
 * App shell — top-level layout.
 *
 * Future modules (Tasks, Daily Ops) will be added here as additional
 * routes. Example pattern:
 *
 *   import { Routes, Route, Link } from 'react-router-dom'
 *   import { TasksModule }     from './modules/tasks/TasksModule'
 *   import { DailyOpsModule }  from './modules/daily-ops/DailyOpsModule'
 *
 *   Then add a module nav bar and route each module to its path.
 */
export default function App() {
  return (
    <>
      <Header moduleTitle="N/A Beverage Management" />
      <BeverageModule />
    </>
  )
}
