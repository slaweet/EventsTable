/**
 * EventsTable extension
 * v0.1
 *
 * This extension replaces the original EventsList from the
 * gnome-shell panel with a EventsTable that shows events
 * in a grid as rectangles with height proportional to event 
 * duration.
 *
 */
const St = imports.gi.St;

const Calendar = imports.ui.calendar;
const Main = imports.ui.main;

// in org.gnome.desktop.interface
const CLOCK_FORMAT_KEY        = 'clock-format';

function _addHalfHour(date) {
    return new Date(date.getTime() + 30 * 60 * 1000);
}

function _downToHalfHour(date) {
    return new Date(date.getTime() - date.getTime() % (30 * 60 * 1000));
}

function EventsTableExtension() {
    this._init();
}

EventsTableExtension.prototype = {
    _init: function() {
        this.eventList = Main.panel._dateMenu._eventList;
    },

    _addTableEvent: function(parentBox, event, clockFormat, widthRatio) {
        let time = Calendar._formatEventTime(event, clockFormat);
        let summary = event.summary;
        let duration = ((event.end.getTime()-event.date.getTime()) / (1000 * 60 ));
        if(event.allDay)
            duration = 30; 
        let box = new St.BoxLayout({style_class: 'events-event-container'});

        parentBox.add(box);
        box.set_height(duration / (3/2));
        box.set_width(box.get_width() * widthRatio);
        box.add(new St.Label( { style_class: 'events-day-time events-day-time-table',
                                text: time} ));
        let descLabel = new St.Label( { style_class: 'events-day-task events-day-task-table',
                                text: summary} );
        descLabel.set_height(box.get_height());
        descLabel.clutter_text.line_wrap = true;
        box.add(descLabel)
    },

    _widthRatio: function(events, n) {
            let first = (n == 0 ? 1 : 0);
            let count = (n == events.length -1 ? 1 : 2);
            for (let i = first; i < count; i++)
                if(_downToHalfHour(events[n-1+i].date).getTime() == _downToHalfHour(events[n+i].date).getTime())
                    return 0.5;
            return 1;
    },

    _addPeriod: function(header, begin, end, includeDayName, showNothingScheduled) {
        if (!this._eventSource)
            return;

        let events = this._eventSource.getEvents(begin, end);

        if (events.length == 0 || includeDayName) {
			this._originalAddPeriod(header, begin, end, includeDayName, showNothingScheduled);
			return;
		}
        let clockFormat = this._desktopSettings.get_string(CLOCK_FORMAT_KEY);;

        let vbox = new St.BoxLayout( {vertical: true} );
        if( this.actor.get_children().length == 0) {
            this.hbox =  new St.BoxLayout();
            this.actor.add(this.hbox, {expand: true});
        }
        this.hbox.add(vbox);

        vbox.add(new St.Label({ style_class: 'events-day-header', text: header }));
        let allDayBox = new St.BoxLayout({style_class: 'events-allday-box'});
        vbox.add(allDayBox);
        let marginAllDayBox = new St.BoxLayout();
        allDayBox.add(marginAllDayBox);
        let box = new St.BoxLayout({style_class: 'events-header-hbox'});
        let dayNameBox = new St.BoxLayout({ vertical: true, style_class: 'events-day-name-box' });
        let timeBox = new St.BoxLayout({ vertical: true, style_class: 'events-table-box events-table-time-box' });
        let eventTitleBox = new St.BoxLayout({ vertical: true, style_class: 'events-table-box' });
        box.add(dayNameBox, {x_fill: false});
        box.add(timeBox, {x_fill: false});
        box.add(eventTitleBox, {x_fill: false});

        let scrollview = new St.ScrollView({ x_fill: true, y_fill: true });
        scrollview.get_hscroll_bar().hide();
        scrollview.add_actor(box);
        vbox.add(scrollview);

        let now = new Date();
        let firstRow = _downToHalfHour(events[0].date);
        let n = 0;
        while(events[n].allDay) {
                this._addTableEvent(allDayBox, events[n], clockFormat, 1);
                n++;
                firstRow = _downToHalfHour(events[n].date);
        }
        let lastRow = _downToHalfHour(events[events.length - 1].end);
        for (let h = firstRow; h.getTime() <= lastRow.getTime(); h = _addHalfHour(h)) {
            let dayString = '';
            let dayStyle = 'events-day-dayname events-line';
            if(h.getMinutes() == 0) {
            //pretty ugly creating new object just to get formated time.
                dayString = Calendar._formatEventTime(new Calendar.CalendarEvent(h, h, "", false), clockFormat);
                if(n > 0)
                    dayStyle += ' events-period';
            }
            if(h.getTime() == (_downToHalfHour(now)).getTime()) {
                dayStyle += ' events-now-line'; 
            }
            timeBox.add(new St.Label( { style_class: dayStyle,
                                        text: dayString } ));
            let eventBox = new St.BoxLayout({style_class: dayStyle});
            eventTitleBox.add(eventBox);
            while(n < events.length && _downToHalfHour(events[n].date).getTime() == h.getTime() ) {
                    this._addTableEvent(eventBox, events[n], clockFormat, this._widthRatio(events, n));
                    n++
            }
		}
        marginAllDayBox.set_width(timeBox.get_width());
    },

    disable: function() {
        let list = this.eventList;
        if(list._originalAddPeriod)
            list._addPeriod = list._originalAddPeriod;
        list._originalAddPeriod = undefined;
        list._addTableEvent = undefined;
        list._widthRatio = undefined;
    },

    enable: function() {
        let list = this.eventList;
        if(!list._originalAddPeriod)
            list._originalAddPeriod = list._addPeriod;
        list._addPeriod = this._addPeriod;
        list._addTableEvent = this._addTableEvent;
        list._widthRatio = this._widthRatio;
    }	   
}

function init() {
    return new EventsTableExtension();
}
