import { AppDispatch } from '@/redux/Store'
import { setBootstrapping, setDashboardSummary } from '@/redux/state/GymStates'
import { api } from '@/services/Api'

export async function warmSession(dispatch: AppDispatch) {
    dispatch(setBootstrapping({ bootstrapping: true }))
    try {
        const dashboardPromise = api.dashboardAPI().then((res) => {
            if (res.kind === 'ok') {
                dispatch(setDashboardSummary({ dashboardSummary: res.data }))
            }
            return res
        })

        await Promise.all([
            api.gymInfo(),
            api.allClients(),
            dashboardPromise,
        ])
    } finally {
        dispatch(setBootstrapping({ bootstrapping: false }))
    }
}
