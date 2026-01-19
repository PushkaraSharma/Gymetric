import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../Store";

export interface GymStates {
    loggedInUser?: { [key: string]: any } | null,
    loading?: boolean,
    gymInfo?: { [key: string]: any } | null,
    allClients?: { [key: string]: any }[]
}

const initialState: GymStates = {
    loggedInUser: null,
    loading: false,
    gymInfo: null,
    allClients: []
}

const GymSlice = createSlice({
    name: 'Gym',
    initialState,
    reducers: {
        setLoggedInUser: (state, action: PayloadAction<GymStates>) => {
            state.loggedInUser = action.payload.loggedInUser;
        },
        setLoading: (state, action: PayloadAction<GymStates>) => {
            state.loading = action.payload.loading;
        },
        setGymInfo: (state, action: PayloadAction<GymStates>) => {
            state.gymInfo = action.payload.gymInfo;
        },
        setAllClients: (state, action: PayloadAction<GymStates>) => {
            state.allClients = action.payload.allClients;
        },
    }
});

export const { setLoggedInUser, setLoading, setGymInfo, setAllClients } = GymSlice.actions;

export const selectLoggedInUser = (state: RootState) => state.GymStates.loggedInUser;
export const selectLoading = (state: RootState) => state.GymStates.loading;
export const selectGymInfo = (state: RootState) => state.GymStates.gymInfo;
export const selectAllClients = (state: RootState) => state.GymStates.allClients;

export default GymSlice.reducer;