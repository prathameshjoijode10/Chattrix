import {create} from 'zustand'

export const useThemeStore = create((set) =>({
  theme:localStorage.getItem("streamify-theme") || "nord",
  setTheme:(theme)=>{
    localStorage.setItem("streamify-theme",theme);
    set({theme});
  }
}))

