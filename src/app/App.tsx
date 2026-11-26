import { Navigate, Route, Router } from '@solidjs/router'
import { lazy } from 'solid-js'
import AppShell from './AppShell'

const InboxPage = lazy(() => import('@/modules/tasks/pages/InboxPage'))
const TodayPage = lazy(() => import('@/modules/tasks/pages/TodayPage'))
const UpcomingPage = lazy(() => import('@/modules/tasks/pages/UpcomingPage'))
const AllTasksPage = lazy(() => import('@/modules/tasks/pages/AllTasksPage'))
const ImportantPage = lazy(() => import('@/modules/tasks/pages/ImportantPage'))
const CompletedPage = lazy(() => import('@/modules/tasks/pages/CompletedPage'))
const ListPage = lazy(() => import('@/modules/lists/pages/ListPage'))
const CalendarPage = lazy(() => import('@/modules/calendar/pages/CalendarPage'))
const SettingsPage = lazy(() => import('@/modules/settings/pages/SettingsPage'))

export default function App() {
  return (
    <Router root={AppShell}>
      <Route path="/" component={() => <Navigate href="/today" />} />
      <Route path="/inbox" component={InboxPage} />
      <Route path="/today" component={TodayPage} />
      <Route path="/upcoming" component={UpcomingPage} />
      <Route path="/tasks" component={AllTasksPage} />
      <Route path="/important" component={ImportantPage} />
      <Route path="/completed" component={CompletedPage} />
      <Route path="/lists/:id" component={ListPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="*" component={() => <Navigate href="/today" />} />
    </Router>
  )
}
