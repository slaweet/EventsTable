/**
 * Alternative EventsList extension
 * v0.1
 *
 * This extension replaces the original EventsList from the
 * gnome-shell panel with a new EventsList that shows events
 * in a grid as rectangles with height proportional to event 
 * duration.
 *
 */
const Lang = imports.lang;
const St = imports.gi.St;

const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Calendar = imports.ui.calendar;
const UPowerGlib = imports.gi.UPowerGlib;

// in org.gnome.desktop.interface
const CLOCK_FORMAT_KEY        = 'clock-format';

function EventsTable(eventSource) {
    this._init(eventSource);
}

	EventsTable.prototype = {
    __proto__: Calendar.EventsList.prototype,

    _addTableEvent: function(eventBox, time, desc, duration) {
	let box = new St.BoxLayout({style_class: 'events-event-container'});
        eventBox.add(box);
	box.set_height((duration + duration/60) / (3/2));
        box.add(new St.Label( { style_class: 'events-day-time events-day-time-table',
                                text: time} ));
	box.add(new St.Label( { style_class: 'events-day-task events-day-task-table',
                                text: desc} ));
    },

    _addPeriod: function(header, begin, end, includeDayName, showNothingScheduled) {
        if (!this._eventSource)
            return;

        let events = this._eventSource.getEvents(begin, end);

        let clockFormat = this._desktopSettings.get_string(CLOCK_FORMAT_KEY);;

        if (events.length == 0 && !showNothingScheduled)
            return;
/*
        if (events.length == 0 && showNothingScheduled
		|| includeDayName) {
			Calendar.EventsList.prototype._addPeriod.call(header, begin, end, includeDayName, showNothingScheduled);
			return;
		}*/
        let scrollview = new St.ScrollView({ x_fill: true, y_fill: true });
        scrollview.get_hscroll_bar().hide();
         let vbox = new St.BoxLayout( {vertical: true} );
        scrollview.add_actor(vbox);
        if(includeDayName) {
            this.actor.add(scrollview);
        }
        else {
            if( this.actor.get_children().length == 0) {
	            this.hbox =  new St.BoxLayout();
                this.actor.add(this.hbox, {expand: true});
            }
            this.hbox.add(scrollview, {expand: true});
        }
        vbox.add(new St.Label({ style_class: 'events-day-header', text: header }));
        let box = new St.BoxLayout({style_class: 'events-header-hbox'});
        let dayNameBox = new St.BoxLayout({ vertical: true, style_class: 'events-day-name-box' });
        let timeBox = new St.BoxLayout({ vertical: true, style_class: 'events-time-box' });
        let eventTitleBox = new St.BoxLayout({ vertical: true, style_class: 'events-event-box' });
        box.add(dayNameBox, {x_fill: false});
        box.add(timeBox, {x_fill: false});
        box.add(eventTitleBox, {expand: true});
        vbox.add(box);
		if(includeDayName){
			for (let n = 0; n < events.length; n++) {
				let event = events[n];
				let dayString = Calendar._getEventDayAbbreviation(event.date.getDay());
				let timeString = Calendar._formatEventTime(event, clockFormat);
				let summaryString = event.summary;
				this._addEvent(dayNameBox, timeBox, eventTitleBox, includeDayName, dayString, timeString, summaryString);
			}
		}
		else if(events.length > 0){
			let now = new Date();
			let firstRow = _downToHalfHour(events[0].date);
			let lastRow = _downToHalfHour(events[events.length - 1].end);
			let n = 0;
			for (let h = firstRow; h.getTime() <= lastRow.getTime(); h = _addHalfHour(h)) {
				let dayString = '';
				let dayStyle = 'events-day-dayname events-line';
				timeBox.style_class = 'events-table-box events-table-time-box';
				eventTitleBox.style_class = 'events-table-box';
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
				for(let event = events[n]; n < events.length && _downToHalfHour(event.date).getTime() == h.getTime(); event = events[++n]) {
					let timeString = Calendar._formatEventTime(event, clockFormat);
					let summaryString = event.summary;
					let duration = ((event.end.getTime()-event.date.getTime()) / (1000 * 60 ));
					this._addTableEvent(eventBox, timeString, summaryString, duration);
				}
			}
		}

        if (events.length == 0 && showNothingScheduled) {
            let now = new Date();
            // Translators: Text to show if there are no events 
            let nothingEvent = new Calendar.CalendarEvent(now, now, _("Nothing Scheduled"), true);
            let timeString = Calendar._formatEventTime(nothingEvent, clockFormat);
            this._addEvent(dayNameBox, timeBox, eventTitleBox, false, "", timeString, nothingEvent.summary);
        }
    },

    _update: function() {
        let today = new Date();
        if (Calendar._sameDay (this._date, today)) {
            this._showToday();
        } else {
            this._showOtherDay(this._date);
        }
    }
}

function _addHalfHour(date) {
    return new Date(date.getTime() + 30 * 60 * 1000);
}
function _downToHalfHour(date) {
    return new Date(date.getTime() - date.getTime() % (30 * 60 * 1000));
}

function update() {
        let eventBox = Main.panel._dateMenu.menu.box.get_children()[0].get_children()[2];
	//Don't know how to insert eventList before Open Calendar, so destroy all and add in desired order.
	eventBox.destroy_children();
	eventBox.add(Main.panel._dateMenu._eventList.actor, { expand: true });
        
	let item = new PopupMenu.PopupMenuItem(_("Open Calendar"));
	item.connect('activate', Lang.bind(Main.panel._dateMenu, Main.panel._dateMenu._onOpenCalendarActivate));
	item.actor.can_focus = false;
        eventBox.add(item.actor, {y_align: St.Align.END, expand: true, y_fill: false});
}

function init() {
}

function disable() {
        Main.panel._dateMenu._eventList = new Calendar.EventsList(Main.panel._dateMenu._eventSource);
	update();
}
function enable() {
        Main.panel._dateMenu._eventList = new EventsTable(Main.panel._dateMenu._eventSource);
	update();
}	   

