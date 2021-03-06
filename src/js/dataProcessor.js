var dataProcessor = function (service) {

        var model = this;

        model.process = function (name, dataset) {
            var processedDataset;

            if (name === "worldBankData") {
                processedDataset = model.processWorldBankPm25Dataset(dataset);
                service.addOriginalDataset(name, processedDataset);
                service.addActiveDataset(name, processedDataset);
            } else if (name === "cityPmData") {
                processedDataset = model.processPmCitiesDataset(dataset);
                service.addOriginalDataset(name, processedDataset);
                service.addActiveDataset(name, processedDataset);
                service.cities = model.getCities(processedDataset);
            } else if (name === "mapTopoJson") {
                // set does not need to be parsed in any way, but has to be added to service.
                service.addOriginalDataset(name, dataset);
                service.addActiveDataset(name, dataset);
            }
            else if (name === "deathData") {
                processedDataset = model.processDeathDataset(dataset);
                service.addOriginalDataset(name, processedDataset);
                service.addActiveDataset(name, processedDataset);
            }
            else if (name === "beijingData") {
                processedDataset = model.processBeijingData(dataset);
                service.addOriginalDataset(name, processedDataset);
                service.addActiveDataset(name, processedDataset);
            }
            else if (name === "delhiData") {
                processedDataset = model.processDelhiData(dataset);
                service.addOriginalDataset(name, processedDataset);
                service.addActiveDataset(name, processedDataset);
            }
            else if (name === "overtimeData") {
                processedDataset = model.processYearlyData(dataset);
                service.addOriginalDataset(name, processedDataset);
                service.addActiveDataset(name, processedDataset);
            }
            else if (name === "metrics") {
                processedDataset = model.processMetrics(dataset);
                service.addOriginalDataset(name, processedDataset);
                service.addActiveDataset(name, processedDataset);
            }
            else if (name === "coords") {
                processedDataset = model.processCoords(dataset);
                service.addOriginalDataset(name, processedDataset);
                service.addActiveDataset(name, processedDataset);
            }
            else {
                throw new Error("Dataset name '" + name + "' has no defined data processing function.");
            }
        };

        model.processCoords = function (dataset) {

            var countries = service.getActiveDataset("cityPmData");

            dataset.forEach(function (city) {
                    city["latitude"] = +city["latitude"];
                    city["longitude"] = +city["longitude"];

                    var found = false;
                    countries.forEach(function (city2) {

                            if (found === true)
                                return;

                            if (city.city.indexOf(city2["city"] + ", " + city2["country"]) > -1) {
                                city["region"] = city2.region;
                                found = true;
                            }
                        }
                    )

                }
            );

            return dataset;
        };

        model.processMetrics = function (dataset) {

            // INPUT"
            //Country Name,
            // Country Code,
            // Type,
            // Electricity production from coal sources (% of total),
            // Forest area (% of land area),
            // Pump price for gasoline (US$ per liter),
            // "Gross enrolment ratio, tertiary, both sexes (%)",
            // Average precipitation in depth (mm per year),
            // "Life expectancy at birth, total (years)"

            var values = {
                countries: [],
                aggregate: []
            };

            dataset.forEach(function (d) {
                var newValue = {};

                newValue.name = d["Country Name"];
                newValue.code = d["Country Code"];
                newValue.type = d.Type;

                newValue.electricity = +d["Electricity production from coal sources (% of total)"];
                newValue.forest = +d["Forest area (% of land area)"];
                newValue.gasoline = +d["Pump price for gasoline (US$ per liter)"];
                newValue.education = +d["Gross enrolment ratio, tertiary, both sexes (%)"];
                newValue.life = +d["Life expectancy at birth, total (years)"];
                newValue.precipitation = +d["Average precipitation in depth (mm per year)"];
                newValue.pm = +d["PM2.5 air pollution, mean annual exposure (micrograms per cubic meter)"];
                newValue.population = +d["Population"];

                if (isNaN(newValue.pm)) {
                    return;
                }

                if (newValue.type === "Country") {
                    values.countries.push(newValue);
                }
                else {
                    values.aggregate.push(newValue);
                }
            });


            return values;


        };

        model.processYearlyData = function (dataset) {
            var countries = [];
            var combined = [];

            var lowest = 9000001;
            var highest = 0;

            var years = [1990, 1995, 2000, 2005, 2010, 2011, 2013];
            dataset.forEach(function (d) {

                var vals = [];
                for (var i = 0; i < years.length; i++) {
                    d[years[i]] = +d[years[i]];

                    if (isNaN(d[years[i]])) {

                        d[years[i]] = "-";

                        if (i > 0 && i < years.length - 1) {

                            var avg = (d[years[i - 1]] + (+d[years[i + 1]])) / 2;

                            if (isNaN(avg)) {
                                return;
                            }
                            vals.push({year: years[i], val: avg});
                        }
                        else {
                            return;
                        }


                    }
                    else {
                        if (d[years[i]] > highest) {
                            highest = d[years[i]];
                        }
                        if (d[years[i]] < lowest) {
                            lowest = d[years[i]];
                        }

                        vals.push({year: years[i], val: d[years[i]]});
                    }
                }
                d.active = false;
                d.tempActive = false;
                d.vals = vals;
                //County Name
                if (d.Type === "Country") {
                    countries.push(d);
                }
                else {
                    combined.push(d);
                }
            });

            return {countries: countries, combined: combined, yearrange: [1990, 2013], valuerange: [lowest, highest]};
        };

        model.processBeijingData = function (dataset) {

            var values = [];

            var sum = 0;
            var count = 0;
            var curday = null;
            dataset.forEach(function (time) {

                var timestamp = Date.parse(time.date);

                if (curday === null) {
                    sum = +time.concentration;
                    count = 1;
                    curday = timestamp;
                }
                else if (timestamp === curday) {
                    sum += +time.concentration;
                    count++;
                    curday = timestamp;
                }
                else {
                    values.push({time: curday, pm25: sum / count});
                    sum = +time.concentration;
                    count = 1;
                    curday = timestamp;

                }


            });

            // add rest
            values.push({time: curday, pm25: sum / count});
            return values;

        };

        model.processDelhiData = function (dataset) {

            var values = [];

            var sum = 0;
            var count = 0;
            var curday = null;
            dataset.forEach(function (time) {


                if (!time.date) {
                    return;
                }
                var parts = time.date.split("-");
                var timestamp = Date.parse(parts[1] + "/" + parts[0] + "/" + (parts[2]));

                //console.log(timestamp);

                if (curday === null) {
                    sum = +time.concentration;
                    count = 1;
                    curday = timestamp;
                }
                else if (timestamp === curday) {
                    sum += +time.concentration;
                    count++;
                    curday = timestamp;
                }
                else {
                    values.push({time: curday, pm25: sum / count});
                    sum = +time.concentration;
                    count = 1;
                    curday = timestamp;

                }


            });

            // add rest
            values.push({time: curday, pm25: sum / count});
            return values;

        };

        model.processDeathDataset = function (dataset) {


            var global = [];
            var zoom = [];
            dataset.forEach(function (cause) {

                var name = cause.Cause;
                var amount = +cause["Deaths per 100000"];
                var percent = +cause["percent-deaths"];
                var id = cause.Id;

                if (isNaN(id)) {
                    zoom.push({name: name, amount: amount});
                }
                else {
                    global.push({name: name, amount: amount, id: +id, percent: percent});
                }
            });

            global.sort(function (a, b) {
                return b.amount - a.amount;
            });

            return {global: global, zoom: zoom};
        };

        model.processPmCitiesDataset = function (dataset) {

            dataset.forEach(function (city) {
                city["pm2.5Mean"] = +city["pm2.5Mean"];
                city.pm10Mean = +city.pm10Mean;

                var error = "";

                if (city["dataCoverageAlertPM10"].length > 0) {
                    error += city["dataCoverageAlertPM10"] + "<br><br>";
                }
                else if (city["dataCoverageAlertPM2.5"].indexOf("<75%") !== -1) {
                    error += "This station has low data coverage (<75%), therefore the annual mean pollution level may not be an accurate representation of the annual conditions.  Caution is advised when interpreting this result.<br><br>";
                }

/*                if (city["pm10ConvertedAlert"].length > 0) {
                    error += city["pm10ConvertedAlert"] + "<br><br>";
                }*/

                if (city["pm2.5ConvertedAlert"].length > 0) {
                    error += city["pm2.5ConvertedAlert"] + "<br><br>";
                }
                city["error"] = error;

            });


            return dataset;
        };

        model.processWorldBankPm25Dataset = function (dataset) {

            return dataset;
        };

        model.getCities = function (cityPmData) {
            var cities = [];

            cityPmData.forEach(function (city) {
                cities.push({city: city.city, country: city.country});
            });

            return cities;
        };

    }
    ;

module.exports = dataProcessor;

