import EventEmitter from './EventEmitter.js';

export default class Time extends EventEmitter {
    constructor() {
        super();

        // Setup
        this.start = Date.now();
        this.current = this.start;
        this.elapsed = 0;
        this.delta = 16; // ms (asumiendo ~60fps por defecto)
        this.isRunning = true;


        // Comenzar el bucle de tiempo
        window.requestAnimationFrame(() => {
            this.tick();
        });
    }
    
    tick() {

        const currentTime = Date.now();
        this.delta = currentTime - this.current;
        this.current = currentTime;
        this.elapsed = this.current - this.start;
        
        // Emitir evento de tick
        this.trigger('tick');
        
        // Continuar el bucle si está corriendo
        if (this.isRunning) {
            window.requestAnimationFrame(() => {
                this.tick();
            });
        }
    }
    
    stop() {
        this.isRunning = false;
    }
    
    resume() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.tick();
        }
    }
}