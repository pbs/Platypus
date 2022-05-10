import config from 'config';
import recycle from 'recycle';

export default (function () {

    /**
     * This class defines a set that is populated and then pulled from at random. When pulled from, the set will return copies of the contents
     * such that all the contents in the set are used once before there are repeats. Repeats may still occur when the set has been used
     * up or when the number of items requested is greater than the size of the set.
     *
     * @memberof platypus
     * @class RandomSet
     * @param contents {array} The contents that will populate the set.
     * @return {platypus.RandomSet} Returns the new RandomSet object.
     */
    const RandomSet = function (contents) {
            let x = 0;

            if (contents) {
                this.contents = [];
                for (x = 0; x < contents.length; x++) {
                    this.contents.push(contents[x]);
                }
            } else {
                this.contents = [];
            }
            this.availableIndexes = [];

            this.refill();
        },
        proto = RandomSet.prototype;


    proto.refill = function () {
        let x = 0;
        
        for (x = 0; x < this.contents.length; x++) {
            this.availableIndexes.push(x);
        }
    };

    /**
     * Add single element to the content set. Includes the new content in the current set, which means it be returned quickly depending on the remaining set size. 
     *
     * @method platypus.RandomSet#add
     * @param toAdd {primitive|Object} Content to add to the set.
     */
    proto.add = function (toAdd) {
        this.contents.push(toAdd);
        this.availableIndexes.push(this.contents.length - 1);
    };

    /**
     * Remove from the content set. Use removeAll if you want to remove all instances, otherwise only removes the first instance found.
     * 
     * @method platypus.RandomSet#remove
     * @param toRemove {primitive|Object} Content to remove from the set.
     * @param removeAll {boolean} Remove all instances of the primitive/object.
     */
    proto.remove = function (toRemove, removeAll) {
        let index = -1,
            indexesIndex = -1;

        do {
            index = this.contents.indexOf(toRemove);
            if (index !== -1) {
                this.contents.splice(index, 1);
            
                indexesIndex = this.availableIndexes.indexOf(index);
                if (indexesIndex !== -1) {
                    this.availableIndexes.splice(indexesIndex, 1);
                }
            }
        } while (index !== -1 && removeAll);

    };

    /**
     * Get a random member of the set.
     *
     * @method platypus.RandomSet#get
     * @return {primitive|Object} A random member of the set
     */
    proto.get = function () {
        let index = 0;

        if (this.availableIndexes.length === 0) {
            this.refill();
        }

        index = this.availableIndexes.splice(Math.floor(Math.random() * this.availableIndexes.length), 1)[0];

        return this.contents[index];
    };

    /**
     * Get an array of random set members. There may be multiple of the same member in the set if the quantity requested is greater
     * than the set size, or the set is exhausted and replenished while retrieving members.
     *
     * @method platypus.RandomSet#getMultiple
     * @param numberToGet {integer} Number of set members to retrieve
     * @return {primitive|Object} A random member of the set
     */
    proto.getMultiple = function (numberToGet) {
        const toReturn = [];
        let x = 0;
        
        for (x = 0; x < numberToGet; x++) {
            toReturn.push(this.get());
        }

        return toReturn;
    };


    /**
     * Returns an RandomSet from cache or creates a new one if none are available.
     *
     * @method platypus.RandomSet.setUp
     * @return {platypus.RandomSet} The instantiated RandomSet.
     */
    /**
     * Returns a RandomSet back to the cache.
     *
     * @method platypus.RandomSet.recycle
     * @param {platypus.RandomSet} randomSet The RandomSet to be recycled.
     */
    /**
     * Relinquishes properties of the RandomSet and recycles it.
     *
     * @method platypus.RandomSet#recycle
     */
    recycle.add(RandomSet, 'RandomSet', RandomSet, null, true, config.dev);

    return RandomSet;
}());
