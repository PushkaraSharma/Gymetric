import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../Store";

export interface GymStates {
    loggedInUser?: {[key: string]: any}|null
}

const initialState: GymStates = {
    loggedInUser: null
}

const GymSlice = createSlice({
    name: 'Gym',
    initialState,
    reducers: {
        setLoggedInUser: (state, action: PayloadAction<GymStates>) => {
           state.loggedInUser = action.payload.loggedInUser;
        },
    }
});

export const {setLoggedInUser} = GymSlice.actions;


export const selectLoggedInUser = (state: RootState) => state.GymStates.loggedInUser;

export default GymSlice.reducer;